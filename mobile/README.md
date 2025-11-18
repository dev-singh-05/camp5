# UniRizz Mobile App

Expo mobile app for UniRizz - Connect with your campus community.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo Go app on your phone (iOS/Android)
- Supabase account with credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with Supabase credentials (already included)

3. Start development server:
```bash
npm start
```

4. Scan QR code with Expo Go app on your phone

## 📱 Development

- **Start dev server**: `npm start`
- **Run on Android**: `npm run android`
- **Run on iOS**: `npm run ios`
- **Run on web**: `npm run web`

## 🏗️ Tech Stack

- **Expo SDK 54** - React Native framework
- **Expo Router** - File-based navigation
- **NativeWind** - Tailwind CSS for React Native
- **Supabase** - Backend (auth, database, storage, realtime)
- **TypeScript** - Type safety
- **React Native Reanimated** - Animations

## 📂 Project Structure

```
mobile/
├── app/                 # Expo Router screens
│   ├── (auth)/         # Authentication screens
│   ├── (tabs)/         # Main tab navigation
│   ├── dating/         # Dating features
│   ├── clubs/          # Clubs features
│   └── _layout.tsx     # Root layout
├── components/         # Reusable components
├── utils/              # Business logic (copied from web)
├── hooks/              # Custom React hooks
├── constants/          # App constants
└── assets/             # Images, fonts, etc.
```

## 🔄 Code Reusability

All business logic is copied from the web app (`src/utils/`):
- ✅ Supabase queries
- ✅ Authentication logic
- ✅ Dating algorithms
- ✅ Profile management
- ✅ Real-time subscriptions

## 🎨 Styling

Using NativeWind (Tailwind for React Native):
- Same utility classes as web app
- Consistent design system
- Dark theme with glassmorphic UI

## 📦 Build for Production

### Android APK
```bash
eas build --platform android --profile production
```

### iOS IPA
```bash
eas build --platform ios --profile production
```

## 🔧 Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ENABLE_DATING_TEST=true
```

## 📝 Notes

- Web app remains completely untouched in parent directory
- This is a separate mobile app with shared business logic
- Same Supabase backend as web app
