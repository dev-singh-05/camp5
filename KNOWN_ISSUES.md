# Known Issues & Solutions

This document tracks known issues, platform-specific quirks, and their workarounds for Campus5 mobile app.

---

## 🔧 Common Build Issues

### Issue: Next.js build fails with "Error: Export encountered errors"

**Problem**: Static export fails when using dynamic features not supported by static export.

**Solution**:
1. Ensure no `getServerSideProps` or `getStaticProps` in pages
2. Remove any dynamic API routes
3. Check for `revalidate` options in components
4. Verify all images use Next.js Image component with proper configuration

**References**: [Next.js Static Export Docs](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

---

### Issue: Capacitor sync fails with "Module not found"

**Problem**: Capacitor can't find the web assets after build.

**Solution**:
```bash
# Clean and rebuild
npm run clean
npm run build:export
npx cap sync
```

**Prevention**: Always use `npm run build:mobile` instead of manual steps.

---

### Issue: iOS build fails with "Provisioning profile doesn't match"

**Problem**: Xcode can't find correct signing certificates.

**Solution**:
1. Open Xcode → Preferences → Accounts
2. Download Manual Profiles
3. Select correct Team in project settings
4. Change Bundle ID if needed (must match App ID)

---

### Issue: Android build fails with Gradle errors

**Problem**: Gradle dependencies or version mismatches.

**Solution**:
```bash
# In android/ directory
./gradlew clean
./gradlew build

# Or use Android Studio's "Clean Project" and "Rebuild Project"
```

---

## 📱 Platform-Specific Issues

### iOS

#### Issue: SafeArea insets not updating on orientation change

**Problem**: Safe area padding doesn't adjust when device rotates.

**Workaround**: The SafeArea component listens for `safeAreaChanged` events, but iOS may not always fire them.

**Solution**: Force refresh by re-mounting the component or manually checking insets on orientation change.

**Status**: ⚠️ Monitoring - may be fixed in future Capacitor versions

---

#### Issue: Haptic feedback doesn't work in simulator

**Problem**: iOS Simulator doesn't support haptic feedback.

**Expected**: This is normal behavior.

**Solution**: Test on real device. No workaround needed.

---

#### Issue: Deep linking not working on first install

**Problem**: App doesn't open from deep link immediately after installation.

**Workaround**: Requires iOS 14+ and proper configuration in Xcode.

**Solution**:
1. Add Associated Domains capability in Xcode
2. Configure apple-app-site-association file
3. Test on real device (not simulator)

---

#### Issue: Image upload fails with "Access Denied"

**Problem**: Missing photo library permissions.

**Solution**: Add to `Info.plist`:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Campus5 needs access to your photos to upload profile pictures</string>
<key>NSCameraUsageDescription</key>
<string>Campus5 needs access to your camera to take profile pictures</string>
```

---

### Android

#### Issue: Back button exits app instead of navigating

**Problem**: BackButton component not working correctly.

**Status**: ✅ Fixed in latest version

**Solution**: Ensure `BackButton` is imported in `LayoutContent.tsx` and homeRoutes are configured.

---

#### Issue: Network detection always shows "unknown"

**Problem**: Android requires specific permissions for network state.

**Solution**: Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

Then sync: `npx cap sync android`

---

#### Issue: Haptic feedback not working on some devices

**Problem**: Some Android devices have haptics disabled or don't support it.

**Expected**: This is device-specific and can't be fixed.

**Workaround**: Haptic feedback is optional enhancement - app works without it.

---

#### Issue: Status bar overlaps content

**Problem**: SafeArea not accounting for Android status bar.

**Solution**:
1. Ensure SafeAreaWrapper is used in LayoutContent
2. Check `StatusBar` plugin configuration
3. May need to add `translucent` style to status bar

---

## 🌐 Web Browser Issues

### Issue: Share button doesn't work on desktop browsers

**Problem**: Web Share API not available on desktop.

**Expected**: This is normal - most desktop browsers don't support sharing.

**Fallback**: NativeShareButton automatically falls back to clipboard copy.

---

### Issue: Pull-to-refresh triggers on desktop

**Problem**: PullToRefresh responds to mouse drag on desktop.

**Solution**: Component checks `isNative()` - only active on mobile. If activating on web, check that `isNative()` is working correctly.

---

## 🔄 Real-time / Supabase Issues

### Issue: Real-time updates stop working after ~30 minutes

**Problem**: Supabase real-time connection times out.

**Solution**: Implement reconnection logic or periodic refresh:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Refresh data
    fetchData();
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

---

### Issue: Too many real-time connections

**Problem**: Each page creates new subscriptions without cleanup.

**Solution**: Always clean up subscriptions in useEffect:
```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', {...}, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

### Issue: "Auth session missing" error

**Problem**: User session expired or not properly initialized.

**Solution**:
1. Check that Supabase client is initialized correctly
2. Verify auth redirect URLs in Supabase dashboard
3. Check that session is persisted in localStorage
4. May need to re-authenticate user

---

### Issue: CORS errors when uploading files

**Problem**: Supabase Storage CORS not configured.

**Solution**:
1. Go to Supabase Dashboard → Storage → Configuration
2. Add allowed origins (including capacitor://*)
3. Allow required methods (POST, PUT, DELETE)

---

## 🎨 UI/UX Issues

### Issue: Animations cause lag on older devices

**Problem**: Framer Motion animations too heavy for low-end devices.

**Solution**: Already implemented - animations disabled on mobile via `useIsMobile()` hook.

**Enhancement**: Could add performance mode setting for users.

---

### Issue: Images loading slowly

**Problem**: Large image files not optimized.

**Solution**:
1. Use Next.js Image component with proper sizing
2. Compress images before upload
3. Use WebP format when possible
4. Implement lazy loading

---

### Issue: Keyboard covers input fields on mobile

**Problem**: Virtual keyboard hides text inputs.

**Solution**:
1. Use Capacitor Keyboard plugin to detect keyboard events
2. Scroll to input when keyboard opens
3. Add appropriate padding to bottom of forms

**Code**:
```typescript
import { Keyboard } from '@capacitor/keyboard';

Keyboard.addListener('keyboardWillShow', info => {
  // Adjust layout
  document.body.style.marginBottom = `${info.keyboardHeight}px`;
});
```

---

## 🔐 Authentication Issues

### Issue: Email verification links don't work on mobile

**Problem**: Email links open in browser instead of app.

**Solution**: Configure deep linking for auth callbacks:
1. Add URL scheme in capacitor.config
2. Update Supabase redirect URLs
3. Handle deep links in app

---

### Issue: Session persists after logout

**Problem**: localStorage not clearing properly.

**Solution**:
```typescript
await supabase.auth.signOut();
// Force clear
localStorage.clear();
// Or specific keys
localStorage.removeItem('supabase.auth.token');
```

---

## 💾 Storage & Data Issues

### Issue: App storage keeps growing

**Problem**: Cache and temp data not cleaned up.

**Solution**: Implement cache cleanup:
1. Clear old image cache
2. Remove expired data from localStorage
3. Limit stored message history

---

### Issue: Data not syncing between devices

**Problem**: Using localStorage instead of server state.

**Solution**: Always use Supabase for data that should sync:
- ❌ Don't store user preferences in localStorage
- ✅ Do store in Supabase user metadata or profiles table

---

## 🚀 Performance Issues

### Issue: App launch is slow (>5 seconds)

**Problem**: Too much initialization on app start.

**Solutions**:
1. Lazy load components not needed immediately
2. Defer non-critical data fetching
3. Use React.lazy and Suspense
4. Optimize bundle size with tree shaking

---

### Issue: High memory usage

**Problem**: Memory leaks in components or subscriptions.

**Solutions**:
1. Always cleanup useEffect subscriptions
2. Remove event listeners on unmount
3. Clear timers and intervals
4. Use Chrome DevTools to profile memory

---

## 🔍 Debugging Tips

### Can't reproduce issue locally

**Problem**: Issue only happens on real device.

**Solutions**:
1. Use DevDebugPanel to check device info
2. Enable remote debugging:
   - iOS: Safari → Develop → [Device]
   - Android: Chrome → chrome://inspect
3. Add console logs (remove before production)
4. Use debug builds instead of release builds

---

### App crashes immediately on launch

**Problem**: Critical error during initialization.

**Debug Steps**:
1. Check native logs:
   - iOS: Xcode → Window → Devices → View Device Logs
   - Android: `adb logcat`
2. Look for JavaScript errors in logs
3. Try clean build: `npm run clean:mobile`
4. Check if all Capacitor plugins are installed

---

### Feature works on one platform but not another

**Problem**: Platform-specific behavior or missing plugin.

**Solutions**:
1. Check if plugin is available: `isPluginAvailable('PluginName')`
2. Verify plugin installed for that platform
3. Check platform-specific permissions
4. Use platform checks: `isIOS()`, `isAndroid()`, `isWeb()`

---

## 📝 Limitations

### Features that work differently on mobile vs web:

1. **File Uploads**:
   - Web: Can select multiple files, drag & drop
   - Mobile: Single file selection, camera access

2. **Sharing**:
   - Web: Fallback to clipboard
   - Mobile: Native share sheet with all apps

3. **Notifications**:
   - Web: Browser notifications (limited)
   - Mobile: Native push notifications (full featured)

4. **Offline Mode**:
   - Web: Limited (Service Workers)
   - Mobile: Better offline support

5. **Performance**:
   - Web: Depends on browser
   - Mobile: More consistent but lower-powered devices

---

## 🔄 Version-Specific Issues

### Capacitor 5.x

- ✅ Safe Area API improved
- ⚠️ Some plugins require migration from v4
- ✅ Better TypeScript support

### Next.js 15

- ✅ App Router stable
- ⚠️ Static export has more limitations
- ✅ Better image optimization

### React 19

- ✅ Better concurrent features
- ⚠️ Some third-party libs may not be compatible yet

---

## 📚 Resources

- [Capacitor Issues](https://github.com/ionic-team/capacitor/issues)
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- [Supabase Support](https://supabase.com/docs/guides/platform/support)
- [Campus5 Debug Panel](./MOBILE_COMPONENTS_USAGE.md#devdebugpanel)

---

## 🆘 Getting Help

If you encounter an issue not listed here:

1. Check DevDebugPanel for environment info
2. Search existing issues on GitHub
3. Create detailed bug report with:
   - Platform (iOS/Android/Web)
   - OS version
   - Device model
   - Steps to reproduce
   - Debug report (from DevDebugPanel)
   - Screenshots/videos

---

**Last Updated**: [Date]
**Next Review**: [Date]
