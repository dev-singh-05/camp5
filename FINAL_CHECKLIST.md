# Campus5 Mobile App - Final Checklist

This checklist ensures your app is ready for production deployment on iOS and Android.

---

## 📋 Pre-Build Checklist

### Environment Configuration
- [ ] `.env.production` file created with production values
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set to production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set to production anon key
- [ ] All `NEXT_PUBLIC_*` environment variables verified
- [ ] No development/test credentials in production env
- [ ] `.env.production` added to `.gitignore`

### Supabase Configuration
- [ ] Production Supabase project created
- [ ] Database schema migrated to production
- [ ] Row Level Security (RLS) policies enabled
- [ ] Storage buckets created with correct policies
- [ ] Redirect URLs configured in Supabase Auth:
  - [ ] `capacitor://campus5` (for mobile deep linking)
  - [ ] Production web URL (if applicable)
  - [ ] `http://localhost:3000` (for development)
- [ ] Email templates customized (if using email auth)
- [ ] Rate limiting configured appropriately
- [ ] Database backups enabled

### App Configuration
- [ ] App name verified in `capacitor.config.ts`
- [ ] App ID verified in `capacitor.config.ts` (e.g., `com.campus5.app`)
- [ ] Version number updated in `package.json`
- [ ] Version code incremented in native projects
- [ ] App icons created for all required sizes:
  - [ ] iOS: 1024x1024 (App Store)
  - [ ] Android: 512x512 (Play Store)
  - [ ] Icons placed in `public/icons/`
- [ ] Splash screen images created (if using)
- [ ] `manifest.json` updated with correct app info

### Code Review
- [ ] All `console.log()` statements removed or wrapped in dev checks
- [ ] No hardcoded API keys or secrets in code
- [ ] All TODO comments addressed or documented
- [ ] Error boundaries implemented for production
- [ ] Analytics/monitoring configured (if using)
- [ ] Crash reporting configured (if using)

---

## 🏗️ Build Verification Checklist

### Web Build
- [ ] `npm run build:export` completes without errors
- [ ] No TypeScript errors in build output
- [ ] No ESLint errors in build output
- [ ] `out/` directory created successfully
- [ ] Static export includes all pages
- [ ] Image optimization working correctly
- [ ] No missing dependencies warnings

### Native Sync
- [ ] `npx cap sync` runs without errors
- [ ] iOS project synced (if building for iOS)
- [ ] Android project synced (if building for Android)
- [ ] Native dependencies installed correctly
- [ ] Capacitor plugins detected in sync output
- [ ] No version mismatch warnings

### iOS Build (if applicable)
- [ ] Xcode project opens without errors
- [ ] Correct development team selected
- [ ] Provisioning profiles configured
- [ ] Bundle identifier matches App ID
- [ ] Build number incremented
- [ ] Info.plist permissions configured:
  - [ ] Camera usage description (if using camera)
  - [ ] Photo library usage description (if using photos)
  - [ ] Push notifications (if using)
- [ ] iOS build succeeds in Xcode

### Android Build (if applicable)
- [ ] Android Studio project opens without errors
- [ ] Gradle sync completes successfully
- [ ] Package name matches App ID
- [ ] Version code incremented
- [ ] Version name matches package.json
- [ ] AndroidManifest.xml permissions configured:
  - [ ] INTERNET (required)
  - [ ] ACCESS_NETWORK_STATE (for network detection)
  - [ ] VIBRATE (for haptics)
  - [ ] Others as needed
- [ ] Signing configuration set up (for release builds)
- [ ] ProGuard/R8 rules configured (if needed)
- [ ] Android build succeeds

---

## 🧪 Testing Checklist

### App Launch
- [ ] App launches successfully on iOS device
- [ ] App launches successfully on Android device
- [ ] No crash on launch
- [ ] Splash screen displays correctly
- [ ] Initial page loads within 3 seconds
- [ ] No console errors on launch

### Authentication Flow
- [ ] Sign up flow works correctly
- [ ] Email verification works (if applicable)
- [ ] Login flow works correctly
- [ ] Password reset works (if applicable)
- [ ] Social auth works (if configured)
- [ ] Logout works correctly
- [ ] Session persists after app restart
- [ ] Protected routes redirect to login

### Navigation
- [ ] All tab navigation works
- [ ] All page links work correctly
- [ ] Back button works on Android
- [ ] Double-back to exit on home pages
- [ ] Deep linking works (if configured)
- [ ] No broken links
- [ ] Smooth transitions between pages

### Database Operations
- [ ] Create operations work (POST)
- [ ] Read operations work (GET)
- [ ] Update operations work (PUT/PATCH)
- [ ] Delete operations work (DELETE)
- [ ] Real-time updates work (if using)
- [ ] Data persists correctly
- [ ] Error handling works for failed operations

### Features Testing

#### Dating Module
- [ ] Profile creation/edit works
- [ ] Matching algorithm works
- [ ] Chat functionality works
- [ ] Real-time chat updates work
- [ ] Request system works
- [ ] Verification upload works
- [ ] Image uploads work

#### Clubs Module
- [ ] Club creation works
- [ ] Join club works
- [ ] Leave club works
- [ ] Club chat works
- [ ] Leaderboard updates correctly
- [ ] Passcode protection works

#### Ratings Module
- [ ] Submit rating works
- [ ] View ratings works
- [ ] Leaderboard updates
- [ ] Connections work

#### Profile Module
- [ ] Profile photo upload works
- [ ] Profile edit works
- [ ] Profile view works
- [ ] XP/level system works

### Native Features
- [ ] Haptic feedback works on supported devices
- [ ] Native share sheet works
- [ ] Safe area insets respected (notches, navigation bars)
- [ ] Pull-to-refresh works (if implemented)
- [ ] Network status detection works
- [ ] Push notifications work (if implemented)
- [ ] Camera/photo access works (if implemented)

### Offline Behavior
- [ ] App handles offline state gracefully
- [ ] Appropriate error messages shown when offline
- [ ] Network-dependent actions disabled when offline
- [ ] App doesn't crash when going offline mid-operation
- [ ] Data queued for sync (if offline sync implemented)

### Error Handling
- [ ] Network errors handled gracefully
- [ ] API errors shown to user appropriately
- [ ] 404 errors handled
- [ ] 500 errors handled
- [ ] Validation errors displayed correctly
- [ ] No uncaught exceptions crash the app

---

## ⚡ Performance Checklist

### App Performance
- [ ] App launches in under 3 seconds
- [ ] Pages load quickly (under 1 second)
- [ ] Smooth scrolling with no lag
- [ ] Animations run at 60fps
- [ ] Images load efficiently
- [ ] No memory leaks detected
- [ ] Memory usage stays under 200MB (approximate)
- [ ] CPU usage reasonable during normal use

### Battery Usage
- [ ] Battery drain is acceptable (test 30 min usage)
- [ ] No excessive background activity
- [ ] Location services used appropriately (if used)
- [ ] Network requests batched when possible
- [ ] Animations disabled on low power mode (optional)

### Network Performance
- [ ] API calls are optimized
- [ ] Unnecessary network requests eliminated
- [ ] Images compressed appropriately
- [ ] API responses cached when appropriate
- [ ] Realtime subscriptions cleaned up properly
- [ ] App works on slow 3G connection

### Storage
- [ ] Local storage usage reasonable
- [ ] Old data cleared appropriately
- [ ] Cache management implemented
- [ ] Storage permissions requested correctly (if needed)

---

## 🚀 Pre-Release Checklist

### Device Testing
- [ ] Tested on real iOS device (not just simulator)
- [ ] Tested on real Android device (not just emulator)
- [ ] Tested on multiple screen sizes:
  - [ ] Small phone (iPhone SE, small Android)
  - [ ] Medium phone (iPhone 13, Pixel)
  - [ ] Large phone (iPhone 14 Pro Max, large Android)
  - [ ] Tablet (if supporting tablets)
- [ ] Tested on different OS versions:
  - [ ] iOS 14+ (if supporting)
  - [ ] Android 8+ (if supporting)

### Stress Testing
- [ ] No crashes during 10-minute continuous usage
- [ ] No crashes during 30-minute continuous usage
- [ ] App stable with poor network conditions
- [ ] App stable with airplane mode toggle
- [ ] App handles rapid navigation correctly
- [ ] App handles background/foreground transitions

### Security Review
- [ ] API keys not exposed in client code
- [ ] Sensitive data encrypted in storage
- [ ] HTTPS used for all API calls
- [ ] Authentication tokens stored securely
- [ ] No console logs in production
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### Compliance
- [ ] Privacy policy created and linked in app
- [ ] Terms of service created and linked in app
- [ ] Age restrictions appropriate (13+, 17+, etc.)
- [ ] Data collection disclosed appropriately
- [ ] GDPR compliance (if applicable)
- [ ] COPPA compliance (if under 13)
- [ ] Required permissions justified

### App Store Preparation

#### iOS App Store
- [ ] App Store Connect account set up
- [ ] App created in App Store Connect
- [ ] App Store screenshots created (all required sizes)
- [ ] App preview video created (optional)
- [ ] App description written
- [ ] Keywords selected
- [ ] Support URL configured
- [ ] Privacy policy URL added
- [ ] App category selected
- [ ] Age rating completed
- [ ] Pricing configured
- [ ] Export compliance information provided

#### Google Play Store
- [ ] Google Play Console account set up
- [ ] App created in Play Console
- [ ] Store listing screenshots created (all required sizes)
- [ ] Feature graphic created (1024x500)
- [ ] App description written (short & full)
- [ ] App category selected
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL added
- [ ] Support email configured
- [ ] Pricing configured
- [ ] Target countries selected

### Final Verification
- [ ] All features from requirements implemented
- [ ] All known critical bugs fixed
- [ ] All teammates reviewed the app
- [ ] Beta testers provided feedback
- [ ] Feedback incorporated or documented
- [ ] Release notes prepared
- [ ] Marketing materials ready (if applicable)
- [ ] Support documentation ready

---

## 📝 Sign-off

### Team Sign-offs
- [ ] Developer sign-off: _______________  Date: _______________
- [ ] QA sign-off: _______________  Date: _______________
- [ ] Product owner sign-off: _______________  Date: _______________
- [ ] Stakeholder approval: _______________  Date: _______________

### Release Information
- Version: _______________
- Build number: _______________
- Release date: _______________
- Release notes: _______________

---

## 🆘 Emergency Contacts

If issues arise during release:
- Developer: _______________
- DevOps: _______________
- Product Manager: _______________
- Emergency rollback procedure: _______________

---

## 📚 Additional Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://support.google.com/googleplay/android-developer/topic/9858052)

---

**Last Updated**: [Date]
**Next Review**: [Date]
